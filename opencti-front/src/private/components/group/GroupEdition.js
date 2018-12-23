import React, { Component } from 'react';
import PropTypes from 'prop-types';
import graphql from 'babel-plugin-relay/macro';
import { createFragmentContainer, requestSubscription } from 'react-relay';
import {
  compose, insert, find, propEq,
} from 'ramda';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { Close } from '@material-ui/icons';
import environment from '../../../relay/environment';
import inject18n from '../../../components/i18n';
import { SubscriptionAvatars } from '../../../components/Subscription';
import GroupEditionOverview from './GroupEditionOverview';

const styles = theme => ({
  header: {
    backgroundColor: theme.palette.navAlt.backgroundHeader,
    padding: '20px 20px 20px 60px',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    left: 5,
  },
  importButton: {
    position: 'absolute',
    top: 15,
    right: 20,
  },
  container: {
    padding: '10px 20px 20px 20px',
  },
  appBar: {
    width: '100%',
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: theme.palette.navAlt.background,
    color: theme.palette.header.text,
    borderBottom: '1px solid #5c5c5c',
  },
  title: {
    float: 'left',
  },
});

const subscription = graphql`
  subscription GroupEditionSubscription($id: ID!) {
    group(id: $id) {
      ...GroupEdition_group
    }
  }
`;

class GroupEdition extends Component {
  constructor(props) {
    super(props);
    this.state = { currentTab: 0 };
  }

  componentDidMount() {
    const sub = requestSubscription(
      environment,
      {
        subscription,
        variables: {
          // eslint-disable-next-line
          id: this.props.group.__id,
        },
        onError: error => console.log(error),

      },
    );
    this.setState({
      sub,
    });
  }

  componentWillUnmount() {
    this.state.sub.dispose();
  }

  handleChangeTab(event, value) {
    this.setState({ currentTab: value });
  }

  render() {
    const {
      t, classes, handleClose, group, me,
    } = this.props;
    const { editContext } = group;
    // Add current group to the context if is not available yet.
    const missingMe = find(propEq('username', me.email))(editContext) === undefined;
    const editUsers = missingMe ? insert(0, { username: me.email }, editContext) : editContext;
    return (
      <div>
        <div className={classes.header}>
          <IconButton aria-label='Close' className={classes.closeButton} onClick={handleClose.bind(this)}>
            <Close fontSize='small'/>
          </IconButton>
          <Typography variant='h6' classes={{ root: classes.title }}>
            {t('Update a group')}
          </Typography>
          <SubscriptionAvatars users={editUsers}/>
          <div className='clearfix'/>
        </div>
        <div className={classes.container}>
          <AppBar position='static' elevation={0} className={classes.appBar}>
            <Tabs value={this.state.currentTab} onChange={this.handleChangeTab.bind(this)}>
              <Tab label={t('Overview')}/>
              <Tab label={t('Permissions')}/>
              <Tab label={t('Members')}/>
            </Tabs>
          </AppBar>
          {this.state.currentTab === 0 && <GroupEditionOverview
              group={this.props.group} editUsers={editUsers} me={me}/>}
        </div>
      </div>
    );
  }
}

GroupEdition.propTypes = {
  handleClose: PropTypes.func,
  classes: PropTypes.object,
  group: PropTypes.object,
  me: PropTypes.object,
  theme: PropTypes.object,
  t: PropTypes.func,
};

const GroupEditionFragment = createFragmentContainer(GroupEdition, {
  group: graphql`
    fragment GroupEdition_group on Group {
      ...GroupEditionOverview_group,
      editContext {
        username,
        focusOn
      }
    }
  `,
  me: graphql`
    fragment GroupEdition_me on User {
      email
    }
  `,
});

export default compose(
  inject18n,
  withStyles(styles, { withTheme: true }),
)(GroupEditionFragment);
