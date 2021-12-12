import Link from 'next/link';
import Auth from "../../utils/auth";
import theme from "../../theme";
import {User} from "../../interfaces/Builds";

interface Props {
    user: User,
    isOwnProfile: boolean,
}

const ProfileNavBar = ({ user, isOwnProfile}: Props) => {
    return <div className="profile-nav-bar">
        <div className="user-info">
            <div className="avatar" />
            <h2 className="username">{user.username}</h2>
        </div>
        <div className="list">
            <Link href={"/user/" + user.uuid}><a>Profile</a></Link>
            <Link href={"/user/" + user.uuid + "/builds"}><a>{isOwnProfile ? "Your Builds" : "Builds 40"}</a></Link>
            <Link href={"/user/" + user.uuid + "/favorites"}><a>Favorite Builds</a></Link>
            {isOwnProfile && <Link href={"/user/" + user.uuid + "/saved"}><a>Saved Builds</a></Link>}
        </div>
        <style jsx>
            {`
                .profile-nav-bar {
                    color: ${theme.highContrastDark};
                    display: flex;
                    justify-content: space-between;
                    padding: 1em;
                    margin: 2em;
                    border-bottom: 1px solid ${theme.lowContrastLight};
                }
                
                .user-info {
                  display: flex;
                  flex-direction: row;
                  align-items: center;
                }
                
                .avatar {
                    background: url("https://crafatar.com/avatars/${user.uuid}");
                    background-size: contain;
                    background-position: center;
                    background-repeat: no-repeat;
                    width: 2.5em;
                    height: 2.5em;
                    display: inline-block;
                    margin-right: 0.5em;
                }
                
                .list {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    margin: 0 -0.5em;
                }
                
                .list a, .list span {
                    color: inherit;
                    margin: 0 0.5em;
                    text-decoration: none;
                    font-weight: 500;
                }
                
                .list a:hover {
                    cursor: pointer;
                    text-decoration: underline;
                }
            `}
        </style>
    </div>;
}

export default ProfileNavBar;
